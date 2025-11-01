"use client";

import React from 'react';
import { SimpleAIChat } from '@/components/ui/SimpleAIChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useSimpleAI } from '@/hooks/use-simple-ai';

export default function ArtisanBuddySimplePage() {
    const { isOnline, getCacheStats } = useSimpleAI();
    const cacheStats = getCacheStats();

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                Artisan Buddy
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Your AI assistant for crafts and business
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <Badge variant={isOnline ? "default" : "destructive"} className="px-3 py-1">
                            {isOnline ? (
                                <>
                                    <Wifi className="h-4 w-4 mr-2" />
                                    Online - Live AI
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-4 w-4 mr-2" />
                                    Offline - Cached Responses
                                </>
                            )}
                        </Badge>

                        {cacheStats.totalEntries > 0 && (
                            <Badge variant="outline" className="px-3 py-1">
                                {cacheStats.totalEntries} cached responses
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Main Chat Interface */}
                <div className="max-w-4xl mx-auto">
                    <SimpleAIChat
                        maxHeight="600px"
                        placeholder="Ask me about your craft, business, marketing, government schemes... (Hindi/English)"
                        className="shadow-xl border-0 bg-white/80 backdrop-blur-sm"
                    />
                </div>

                {/* Quick Help */}
                <div className="max-w-4xl mx-auto mt-8">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-center">What can I help you with?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                                    <div className="text-2xl mb-2">💰</div>
                                    <h3 className="font-semibold text-blue-800">Business</h3>
                                    <p className="text-sm text-blue-600">Pricing, profits, planning</p>
                                </div>

                                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                                    <div className="text-2xl mb-2">🎨</div>
                                    <h3 className="font-semibold text-green-800">Crafts</h3>
                                    <p className="text-sm text-green-600">Designs, materials, techniques</p>
                                </div>

                                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
                                    <div className="text-2xl mb-2">📱</div>
                                    <h3 className="font-semibold text-purple-800">Marketing</h3>
                                    <p className="text-sm text-purple-600">Online selling, social media</p>
                                </div>

                                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
                                    <div className="text-2xl mb-2">🏛️</div>
                                    <h3 className="font-semibold text-orange-800">Schemes</h3>
                                    <p className="text-sm text-orange-600">Government support, loans</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sample Queries */}
                <div className="max-w-4xl mx-auto mt-6">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-center">Try asking me...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    "How do I price my handicraft products?",
                                    "मेरे प्रोडक्ट की मार्केटिंग कैसे करूं?",
                                    "What government schemes are available for artisans?",
                                    "How to sell online?",
                                    "बिजनेस कैसे बढ़ाएं?",
                                    "Digital marketing tips for craftspeople",
                                    "PM Vishwakarma Yojana के बारे में बताएं",
                                    "How to improve product quality?"
                                ].map((query, index) => (
                                    <div
                                        key={index}
                                        className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-sm"
                                        onClick={() => {
                                            // You could add functionality to auto-fill the chat input
                                            console.log('Sample query clicked:', query);
                                        }}
                                    >
                                        "{query}"
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-muted-foreground">
                    <p>
                        🌟 Powered by AI • Works online and offline • Supports Hindi & English
                    </p>
                </div>
            </div>
        </div>
    );
}