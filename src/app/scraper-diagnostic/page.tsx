'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface DiagnosticResult {
  platform: string;
  status: 'idle' | 'testing' | 'success' | 'error' | 'timeout';
  message: string;
  duration?: number;
  productCount?: number;
  error?: string;
}

export default function ScraperDiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { platform: 'Amazon', status: 'idle', message: 'Ready to test' },
    { platform: 'Flipkart', status: 'idle', message: 'Ready to test' },
    { platform: 'Meesho', status: 'idle', message: 'Ready to test' },
  ]);

  const updateResult = (platform: string, update: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(result => 
      result.platform === platform ? { ...result, ...update } : result
    ));
  };

  const testPlatform = async (platform: string) => {
    const platformLower = platform.toLowerCase();
    updateResult(platform, { status: 'testing', message: 'Starting test...' });
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/scrape-products?query=handmade pottery&platform=${platformLower}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (data.success && data.data[platformLower]) {
        const productCount = data.data[platformLower].length;
        updateResult(platform, {
          status: 'success',
          message: `✅ Working! Found ${productCount} products`,
          duration,
          productCount
        });
      } else {
        updateResult(platform, {
          status: 'error',
          message: `❌ No products found`,
          duration,
          error: data.error || 'No products returned'
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult(platform, {
        status: 'error',
        message: `❌ Test failed`,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testAllPlatforms = async () => {
    for (const result of results) {
      await testPlatform(result.platform);
      // Wait 2 seconds between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'testing': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'timeout': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'timeout': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            🔧 Scraper Diagnostic Tool
          </h1>
          <p className="text-lg text-gray-600">
            Test individual platform scrapers to identify issues and performance
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={testAllPlatforms} size="lg">
              Test All Platforms
            </Button>
            {results.map(result => (
              <Button
                key={result.platform}
                onClick={() => testPlatform(result.platform)}
                variant="outline"
                disabled={result.status === 'testing'}
              >
                Test {result.platform}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.map(result => (
            <Card key={result.platform} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {result.platform}
                  </CardTitle>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <p className="font-medium mb-2">Status:</p>
                  <p className="text-muted-foreground">{result.message}</p>
                </div>

                {result.duration && (
                  <div className="text-sm">
                    <p className="font-medium">Response Time:</p>
                    <p className="text-muted-foreground">{result.duration}ms</p>
                  </div>
                )}

                {result.productCount !== undefined && (
                  <div className="text-sm">
                    <p className="font-medium">Products Found:</p>
                    <p className="text-muted-foreground">{result.productCount}</p>
                  </div>
                )}

                {result.error && (
                  <div className="text-sm">
                    <p className="font-medium text-red-600">Error:</p>
                    <p className="text-red-500 text-xs break-words">{result.error}</p>
                  </div>
                )}

                <Button
                  onClick={() => testPlatform(result.platform)}
                  disabled={result.status === 'testing'}
                  className="w-full"
                  size="sm"
                >
                  {result.status === 'testing' ? 'Testing...' : 'Test Again'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.status === 'success').length}
                </div>
                <div className="text-sm text-green-700">Working</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.status === 'error').length}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {results.filter(r => r.status === 'testing').length}
                </div>
                <div className="text-sm text-blue-700">Testing</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {results.reduce((sum, r) => sum + (r.productCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-700">Total Products</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Troubleshooting Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Timeouts:</strong> Sites may be slow or have anti-bot protection</li>
                <li>• <strong>No Products:</strong> Check if selectors need updating</li>
                <li>• <strong>Errors:</strong> Network issues or site changes</li>
                <li>• <strong>Success:</strong> Platform is working correctly</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}