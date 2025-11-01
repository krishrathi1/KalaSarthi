"use client";

import React from 'react';
import { SimpleAIChat } from '@/components/ui/SimpleAIChat';
import { useSimpleAI } from '@/hooks/use-simple-ai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Trash2 } from 'lucide-react';

export default function SimpleAITestPage() {
    const { getCacheStats, clearOldCache, exportCache, isOnline } = useSimpleAI();
    const cacheStats = getCacheStats();

    const handleClearCache = async () => {
        const success = await clearOldCache();
        if (success) {
            alert('Cache cleared successfully!');
        } else {
            alert('Failed to clear cache');
        }
    };

    const handleExportCache = () => {
        const data = exportCache();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-cache-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Simple AI with Online Sync</h1>
                <p className="text-muted-foreground">
                    Queries online AI when available, caches responses for offline use
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Interface */}
                <div className="lg:col-span-2">
                    <SimpleAIChat
                        maxHeight="500px"
                        placeholder="Ask about your craft, business, marketing..."
                    />
                </div>

                {/* Cache Statistics */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Cache Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Status:</span>
                                <Badge variant={isOnline ? "default" : "destructive"}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </Badge>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span>Cached Responses:</span>
                                <span className="font-medium">{cacheStats.totalEntries}</span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span>Cache Size:</span>
                                <span className="font-medium">{formatBytes(cacheStats.totalSize)}</span>
                            </div>

                            {cacheStats.totalEntries > 0 && (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span>Oldest Entry:</span>
                                        <span className="font-medium">
                                            {new Date(cacheStats.oldestEntry).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span>Newest Entry:</span>
                                        <span className="font-medium">
                                            {new Date(cacheStats.newestEntry).toLocaleDateString()}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cache Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cache Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                onClick={handleExportCache}
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={cacheStats.totalEntries === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export Cache
                            </Button>

                            <Button
                                onClick={handleClearCache}
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={cacheStats.totalEntries === 0}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear Old Cache
                            </Button>
                        </CardContent>
                    </Card>

                    {/* How It Works */}
                    <Card>
                        <CardHeader>
                            <CardTitle>How It Works</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="text-green-600">🌐</span>
                                <span><strong>Online:</strong> Queries live AI service and caches responses</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-blue-600">💾</span>
                                <span><strong>Cache:</strong> Uses previously cached responses for similar queries</span>
                            </div>

                            <div className="flex items-start gap-2">
                                <span className="text-orange-600">📴</span>
                                <span><strong>Offline:</strong> Falls back to basic rule-based responses</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Test Queries */}
            <Card>
                <CardHeader>
                    <CardTitle>Try These Sample Queries</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                            "How do I price my handicraft products?",
                            "मेरे प्रोडक्ट की मार्केटिंग कैसे करूं?",
                            "What government schemes are available for artisans?",
                            "How to sell online?",
                            "बिजनेस कैसे बढ़ाएं?",
                            "Digital marketing tips for craftspeople"
                        ].map((query, index) => (
                            <Badge
                                key={index}
                                variant="outline"
                                className="cursor-pointer hover:bg-muted p-2 text-center"
                                onClick={() => {
                                    // You could add functionality to auto-fill the chat input
                                    console.log('Sample query:', query);
                                }}
                            >
                                {query}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}