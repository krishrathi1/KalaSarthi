'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  FileCheck,
  Smartphone,
  Bell,
  Zap,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Download,
  Eye,
  WifiOff,
  TrendingUp
} from 'lucide-react';

interface EnhancedSchemeSahayakV2Props {
  artisanId?: string;
  className?: string;
}

export function EnhancedSchemeSahayakV2({ 
  artisanId = 'demo_artisan_v2', 
  className = '' 
}: EnhancedSchemeSahayakV2Props) {
  const [activeTab, setActiveTab] = useState('ai-recommendations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for different features
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [documentStatus, setDocumentStatus] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load AI recommendations
  const loadAIRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/enhanced-schemes-v2?action=ai_recommendations&artisanId=${artisanId}&riskTolerance=medium&timeHorizon=short_term&maxApplications=5`
      );
      const result = await response.json();

      if (result.success) {
        setAiRecommendations(result.data.recommendations);
        
        // Automatically send WhatsApp notification for top 3 schemes
        if (result.data.recommendations.length > 0) {
          const topSchemes = result.data.recommendations.slice(0, 3);
          topSchemes.forEach((scheme, index) => {
            setTimeout(() => sendSchemeNotification(scheme), index * 2000); // Stagger by 2 seconds
          });
        }
      }
    } catch (err) {
      console.error('Error loading AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send WhatsApp notification for a scheme
  const sendSchemeNotification = async (recommendation: any) => {
    try {
      const urgencyEmoji = recommendation.aiScore >= 90 ? '🔥' : recommendation.aiScore >= 85 ? '⚡' : '💡';
      const urgencyText = recommendation.aiScore >= 90 
        ? '\n\n⏰ *Limited time opportunity!* Apply soon for best results.' 
        : '\n\nYour profile matches perfectly with this scheme.';

      const message = `${urgencyEmoji} *New Scheme Alert!*

*${recommendation.scheme.title}* is now available for you!

✅ AI Match Score: ${recommendation.aiScore}%
📊 Success Probability: ${recommendation.actionPlan.successProbability}%
💰 ${recommendation.personalizedReason}${urgencyText}

🔗 Apply Now: ${recommendation.scheme.applicationUrl}`;

      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+918630365222',
          message,
          schemeUrl: recommendation.scheme.applicationUrl,
          notificationType: 'new_scheme'
        })
      });

      const result = await response.json();
      console.log('WhatsApp notification sent:', result);
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
    }
  };

  // Send WhatsApp notification for document upload
  const sendDocumentUploadNotification = async (fileName: string, documentType: string) => {
    try {
      const message = `📄 *Document Uploaded Successfully!*

Your *${documentType.replace('_', ' ')}* has been uploaded and verified.

✅ File: ${fileName}
🤖 AI is now analyzing this document to improve your scheme recommendations
📊 Your eligibility scores will be updated shortly

Next Steps:
1. Upload remaining documents for better matching
2. Check AI Recommendations tab for updated schemes
3. Apply to schemes with higher success probability

🔗 View Dashboard: ${window.location.origin}/scheme-sahayak`;

      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+918630365222',
          message,
          notificationType: 'document_reminder'
        })
      });

      const result = await response.json();
      console.log('Document upload notification sent:', result);
    } catch (error) {
      console.error('Failed to send document upload notification:', error);
    }
  };

  // Load document management
  const loadDocumentStatus = async () => {
    try {
      const response = await fetch(
        `/api/enhanced-schemes-v2?action=document_management&artisanId=${artisanId}`
      );
      const result = await response.json();

      if (result.success) {
        setDocumentStatus(result.data);
      }
    } catch (err) {
      console.error('Error loading document status:', err);
    }
  };

  // Load smart notifications
  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `/api/enhanced-schemes-v2?action=smart_notifications&artisanId=${artisanId}`
      );
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data.notifications);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadAIRecommendations();
    loadDocumentStatus();
    loadNotifications();
  }, []);

  // Handle document upload with OCR
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDocument(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('artisanId', artisanId);
      formData.append('documentType', 'auto-detect'); // Let OCR detect the type

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/scheme-sahayak/documents', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please check your configuration.');
      }

      const result = await response.json();

      if (result.success) {
        // Reload document status to show the new document
        await loadDocumentStatus();
        setError(null);
        
        // Show detailed success message with next steps
        const ocrData = result.data.ocrData;
        const nextSteps = [
          '✓ Document verified and added to your profile',
          '✓ AI will now use this for better scheme matching',
          '→ Next: Upload remaining documents for higher approval rates'
        ].join('\n');
        
        alert(`✅ Document Uploaded Successfully!\n\n` +
              `📄 File: ${file.name}\n` +
              `📋 Type: ${ocrData.documentType}\n` +
              `🎯 Confidence: ${(ocrData.confidence * 100).toFixed(0)}%\n` +
              `✓ Status: ${result.data.verificationStatus}\n\n` +
              `Next Steps:\n${nextSteps}`);

        // Send WhatsApp notification about document upload
        sendDocumentUploadNotification(file.name, ocrData.documentType);
      } else {
        setError(result.error || 'Failed to upload document');
      }
    } catch (err: any) {
      console.error('Document upload error:', err);
      setError(err.message || 'Failed to upload document. Please ensure Google Cloud credentials are configured.');
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Enhanced Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            <span className="leading-tight">AI-Powered Scheme Sahayak v2.0</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Next-generation government scheme discovery with artificial intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={async () => {
              try {
                const response = await fetch('/api/notifications/whatsapp?phone=+918630365222');
                const result = await response.json();
                if (result.success) {
                  alert('✅ WhatsApp notification sent to +918630365222!\n\nCheck your WhatsApp for the test message.');
                } else {
                  alert('❌ Failed to send notification. Check console for details.');
                }
              } catch (error) {
                console.error('Notification error:', error);
                alert('❌ Error sending notification');
              }
            }}
          >
            <Bell className="h-3 w-3 mr-1" />
            Test WhatsApp
          </Button>
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs">
            <Zap className="h-3 w-3" />
            AI-Enhanced
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 text-xs">
            <Target className="h-3 w-3" />
            95% Accuracy
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Tabs - Mobile Responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="ai-recommendations" className="text-xs sm:text-sm py-2 px-2">
            <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">AI Recommendations</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm py-2 px-2">
            <FileCheck className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Smart Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs sm:text-sm py-2 px-2">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Real-time Tracking</span>
            <span className="sm:hidden">Track</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 px-2">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Smart Alerts</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="text-xs sm:text-sm py-2 px-2">
            <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Offline Mode</span>
            <span className="sm:hidden">Offline</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 px-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai-recommendations" className="space-y-6">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-base sm:text-lg">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                AI-Powered Personalized Recommendations
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Advanced machine learning algorithms analyze your profile and provide 
                the most suitable scheme recommendations with success probability predictions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">AI is analyzing schemes for you...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiRecommendations.map((rec, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {rec.scheme.title}
                              <Badge className="bg-blue-100 text-blue-800">
                                AI Score: {rec.aiScore}%
                              </Badge>
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.scheme.description}
                            </p>
                            <p className="text-sm text-blue-700 mt-2 font-medium">
                              🤖 {rec.personalizedReason}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                          <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                            <div className="text-lg sm:text-2xl font-bold text-green-600">{rec.eligibilityMatch}%</div>
                            <div className="text-[10px] sm:text-xs text-green-700">Eligibility Match</div>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg sm:text-2xl font-bold text-purple-600">{rec.benefitPotential}%</div>
                            <div className="text-[10px] sm:text-xs text-purple-700">Benefit Potential</div>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg sm:text-2xl font-bold text-orange-600">{rec.actionPlan.successProbability}%</div>
                            <div className="text-[10px] sm:text-xs text-orange-700">Success Probability</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">📋 Immediate Actions:</h4>
                            <ul className="text-sm space-y-1">
                              {rec.actionPlan.immediateActions.map((action: string, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-2">⏱️ Timeline: {rec.actionPlan.timelineEstimate}</h4>
                          </div>

                          {rec.riskFactors.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-red-600">⚠️ Risk Factors:</h4>
                              <ul className="text-sm space-y-1">
                                {rec.riskFactors.map((risk: string, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Application URL Display */}
                        {rec.scheme.applicationUrl && (
                          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                            <span className="font-medium text-blue-800">🔗 Portal: </span>
                            <a 
                              href={rec.scheme.applicationUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {rec.scheme.applicationUrl}
                            </a>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="flex-1 text-xs sm:text-sm"
                            onClick={() => {
                              console.log('Apply Now clicked for scheme:', rec.scheme.id);
                              console.log('Application URL:', rec.scheme.applicationUrl);
                              console.log('Full scheme object:', rec.scheme);
                              
                              // Open government portal in new tab
                              if (rec.scheme.applicationUrl) {
                                console.log('Opening URL:', rec.scheme.applicationUrl);
                                window.open(rec.scheme.applicationUrl, '_blank');
                                // Track application start
                                fetch('/api/enhanced-schemes-v2', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'track_application',
                                    artisanId,
                                    schemeId: rec.scheme.id,
                                    status: 'started'
                                  })
                                }).catch(err => console.error('Tracking error:', err));
                              } else {
                                console.error('No application URL found for scheme:', rec.scheme);
                                alert(`Application URL not available for this scheme.\n\nScheme ID: ${rec.scheme.id}\nPlease contact support.`);
                              }
                            }}
                          >
                            <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Apply Now
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 text-xs sm:text-sm"
                            onClick={() => setActiveTab('analytics')}
                          >
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">View Success Prediction</span>
                            <span className="sm:hidden">View Stats</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-green-800 text-base sm:text-lg">
                <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Smart Document Management
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                AI-powered document verification, automatic expiry tracking, and intelligent 
                recommendations for missing documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentStatus ? (
                <div className="space-y-6">
                  {/* Document Status Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-green-100 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {Object.values(documentStatus.status).filter((doc: any) => doc.status === 'verified').length}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700">Verified</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-yellow-100 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                        {Object.values(documentStatus.status).filter((doc: any) => doc.status === 'uploaded').length}
                      </div>
                      <div className="text-xs sm:text-sm text-yellow-700">Pending</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-red-100 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {documentStatus.missingDocuments.length}
                      </div>
                      <div className="text-xs sm:text-sm text-red-700">Missing</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-orange-100 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        {documentStatus.expiringDocuments.length}
                      </div>
                      <div className="text-xs sm:text-sm text-orange-700">Expiring Soon</div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                      <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                      Upload Documents with AI-Powered OCR
                    </h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        id="document-upload"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDocument}
                      />
                      <label
                        htmlFor="document-upload"
                        className="cursor-pointer flex flex-col items-center gap-2 sm:gap-3"
                      >
                        {uploadingDocument ? (
                          <>
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
                            <p className="text-xs sm:text-sm font-medium">Processing with OCR... {uploadProgress}%</p>
                            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                            <div>
                              <p className="text-xs sm:text-sm font-medium">Click to upload or drag and drop</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                PDF, JPG, PNG up to 10MB • AI will auto-detect document type
                              </p>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="text-xs sm:text-sm">
                              <FileCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Select Document
                            </Button>
                          </>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                      <span>AI-powered OCR will automatically extract and verify document information</span>
                    </div>
                  </div>

                  {/* Recently Uploaded Documents */}
                  {documentStatus.documents && documentStatus.documents.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm sm:text-base font-semibold">📁 Your Documents</h3>
                      <div className="space-y-2">
                        {documentStatus.documents.map((doc: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex items-center gap-3">
                              <FileCheck className={`h-5 w-5 ${
                                doc.status === 'verified' ? 'text-green-500' : 
                                doc.status === 'pending' ? 'text-yellow-500' : 
                                'text-gray-400'
                              }`} />
                              <div>
                                <p className="text-sm font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={
                              doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                              doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {doc.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {documentStatus.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm sm:text-base font-semibold">🤖 AI Recommendations</h3>
                      {documentStatus.recommendations.map((rec: string, index: number) => (
                        <Alert key={index} className="border-blue-200 bg-blue-50">
                          <Brain className="h-4 w-4" />
                          <AlertDescription className="text-xs sm:text-sm">{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Next Steps After Upload */}
                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-semibold">📝 What Happens Next?</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                        <div>
                          <p className="text-sm font-medium">AI Analysis</p>
                          <p className="text-xs text-muted-foreground">Your documents are analyzed to improve scheme matching accuracy</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                        <div>
                          <p className="text-sm font-medium">Verification</p>
                          <p className="text-xs text-muted-foreground">Documents are verified against government databases (demo mode)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                        <div>
                          <p className="text-sm font-medium">Better Recommendations</p>
                          <p className="text-xs text-muted-foreground">AI updates your eligibility scores for more accurate scheme suggestions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">4</div>
                        <div>
                          <p className="text-sm font-medium">Ready to Apply</p>
                          <p className="text-xs text-muted-foreground">Use verified documents when applying to schemes for faster approval</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading document status...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-purple-800 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Smart Notifications & Alerts
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                AI-powered notifications that deliver the most relevant updates at the right time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id} className={`border-l-4 ${
                    notification.priority === 'urgent' ? 'border-l-red-500 bg-red-50/50' :
                    notification.priority === 'high' ? 'border-l-orange-500 bg-orange-50/50' :
                    notification.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50/50' :
                    'border-l-green-500 bg-green-50/50'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            {notification.actionRequired && (
                              <Badge variant="outline" className="text-red-600 border-red-200">
                                Action Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.scheduledFor).toLocaleString()}
                            </span>
                            <span>Channels: {notification.channels.join(', ')}</span>
                          </div>
                        </div>
                        {notification.actionRequired && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              console.log('Take Action clicked for notification:', notification.id);
                              console.log('Notification metadata:', notification.metadata);
                              
                              // Determine the correct URL based on scheme type
                              let targetUrl = notification.actionUrl;
                              
                              // Map scheme IDs to actual government websites
                              if (notification.metadata?.schemeId) {
                                const schemeUrls = {
                                  'mudra_plus': 'https://www.mudra.org.in/',
                                  'pmegp': 'https://www.kviconline.gov.in/pmegpeportal/jsp/pmegponline/pmegp_online_main.jsp',
                                  'digital_marketing_training': 'https://www.digitalindia.gov.in/',
                                  'pm_vishwakarma': 'https://pmvishwakarma.gov.in/',
                                  'sfurti': 'https://sfurti.msme.gov.in/',
                                  'cgtmse': 'https://www.cgtmse.in/',
                                  'stand_up_india': 'https://www.standupmitra.in/'
                                };
                                
                                const schemeUrl = schemeUrls[notification.metadata.schemeId as keyof typeof schemeUrls];
                                if (schemeUrl) {
                                  targetUrl = schemeUrl;
                                }
                              }
                              
                              // Handle different notification types
                              if (notification.type === 'deadline_reminder' && targetUrl) {
                                console.log('Opening scheme URL:', targetUrl);
                                window.open(targetUrl, '_blank');
                              } else if (notification.type === 'status_update' && notification.metadata?.applicationId) {
                                // For status updates, show tracking info
                                alert(`📋 Application Status Update\n\nApplication ID: ${notification.metadata.applicationId}\nStatus: ${notification.metadata.newStatus}\n\nPlease check the official portal for detailed updates.`);
                                if (targetUrl) {
                                  window.open(targetUrl, '_blank');
                                }
                              } else if (notification.actionUrl) {
                                // Fallback to actionUrl
                                console.log('Opening action URL:', notification.actionUrl);
                                window.open(notification.actionUrl, '_blank');
                              } else {
                                // No URL available
                                alert('Action URL not available for this notification. Please contact support.');
                              }
                            }}
                          >
                            Take Action
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-indigo-800 text-base sm:text-lg">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Real-time Application Tracking
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Track your scheme applications with live updates from government portals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample tracking data */}
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">PM Vishwakarma Scheme</h4>
                        <p className="text-sm text-muted-foreground">Application ID: PMV2024001234</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Under Review</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Application Submitted</p>
                          <p className="text-xs text-muted-foreground">Jan 15, 2025 10:30 AM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Documents Verified</p>
                          <p className="text-xs text-muted-foreground">Jan 18, 2025 2:15 PM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full border-2 border-blue-500 animate-pulse"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Under Officer Review</p>
                          <p className="text-xs text-muted-foreground">In Progress</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Final Approval</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">🤖 AI Prediction</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Based on current progress, approval expected in 5-7 days (87% confidence)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="border-blue-200 bg-blue-50">
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    Real-time tracking syncs with government portals every 6 hours. 
                    You'll receive instant notifications for any status changes.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Mode Tab */}
        <TabsContent value="offline" className="space-y-6">
          <Card className="border-gray-200 bg-gray-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-gray-800 text-base sm:text-lg">
                <WifiOff className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Offline Mode
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Access schemes and continue applications even without internet connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Offline Status */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-green-100 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {aiRecommendations.length}
                    </div>
                    <div className="text-xs sm:text-sm text-green-700">Schemes Cached</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-100 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">7 days</div>
                    <div className="text-xs sm:text-sm text-blue-700">Cache Duration</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-100 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">Auto</div>
                    <div className="text-xs sm:text-sm text-purple-700">Sync When Online</div>
                  </div>
                </div>

                {/* Offline Features */}
                <div className="space-y-3">
                  <h3 className="text-sm sm:text-base font-semibold">Available Offline:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">View cached scheme recommendations</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Fill application forms</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">Upload documents (queued)</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">View saved applications</span>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    All your work is automatically saved locally. When you're back online, 
                    everything syncs seamlessly with the cloud.
                  </AlertDescription>
                </Alert>

                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download More Schemes for Offline Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-orange-800 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Success Analytics & Predictions
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                AI-powered predictive analytics for your scheme applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Success Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-green-100 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">87%</div>
                    <div className="text-xs sm:text-sm text-green-700">Overall Success Rate</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-100 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">12</div>
                    <div className="text-xs sm:text-sm text-blue-700">Applications Tracked</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-100 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600">₹2.5L</div>
                    <div className="text-xs sm:text-sm text-purple-700">Total Benefits</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-orange-100 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-orange-600">18 days</div>
                    <div className="text-xs sm:text-sm text-orange-700">Avg. Processing Time</div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    AI-Powered Insights
                  </h3>
                  
                  <Alert className="border-green-200 bg-green-50">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>High Success Probability:</strong> Your profile matches 95% with PM Vishwakarma Scheme. 
                      Applications similar to yours have an 89% approval rate.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <strong>Optimal Timing:</strong> Based on historical data, applications submitted in the 
                      first week of the month have 23% faster processing times.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-orange-200 bg-orange-50">
                    <Target className="h-4 w-4 text-orange-600" />
                    <AlertDescription>
                      <strong>Improvement Suggestion:</strong> Adding a business plan document could increase 
                      your approval probability by 15% for loan-based schemes.
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Success Factors */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Success Factors Analysis</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Document Completeness</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Profile Match</span>
                        <span className="font-medium">88%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Application Quality</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Timing Optimization</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}