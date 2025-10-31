'use client';

import { useState } from 'react';
import { DigitalTwinChat } from '@/components/digital-twin-chat';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export default function ArtisanBuddyVoiceTestPage() {
    const [showDebug, setShowDebug] = useState(true);

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            <div className="container mx-auto p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-4 text-center">
                        <div className="flex items-center justify-center gap-4 mb-2">
                            <h1 className="text-2xl font-bold text-orange-800">
                                🎤 Artisan Buddy Voice Integration Test
                            </h1>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDebug(!showDebug)}
                                className="flex items-center gap-2"
                            >
                                {showDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showDebug ? 'Hide' : 'Show'} Debug
                            </Button>
                        </div>
                        <p className="text-gray-600">
                            Testing the new advanced voice features with performance optimization and audio resource management
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
                        {/* Debug Panel */}
                        {showDebug && (
                            <div className="lg:col-span-1">
                                <div className="h-full overflow-y-auto">
                                    <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
                                        <h3 className="font-bold text-lg mb-2">🔧 Voice Debug Guide</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Follow these steps to test the voice features:
                                        </p>
                                        <div className="space-y-3 text-sm">
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                <strong className="text-yellow-800">⚠️ Most Common Issue:</strong>
                                                <p className="mt-1 text-yellow-700">
                                                    Voice input is <strong>disabled by default</strong>. You must enable it first!
                                                </p>
                                            </div>

                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                                <strong className="text-blue-800">📋 Step-by-Step:</strong>
                                                <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-700">
                                                    <li><strong>Click the blue "Input" button</strong> in the chat header (top right)</li>
                                                    <li><strong>Click the green "Output" button</strong> for voice responses (optional)</li>
                                                    <li><strong>Click the microphone button</strong> at bottom right of input field</li>
                                                    <li><strong>Allow microphone permission</strong> when browser prompts</li>
                                                    <li><strong>Speak your message</strong> clearly</li>
                                                </ol>
                                            </div>

                                            <div className="p-3 bg-green-50 border border-green-200 rounded">
                                                <strong className="text-green-800">✅ Expected Behavior:</strong>
                                                <ul className="list-disc list-inside mt-2 space-y-1 text-green-700">
                                                    <li>Microphone button turns <strong>red and pulses</strong> when recording</li>
                                                    <li>Shows <strong>"Processing..."</strong> indicator when analyzing speech</li>
                                                    <li>Converts speech to text and sends message automatically</li>
                                                    <li>Plays AI response as audio (if output enabled)</li>
                                                    <li>Shows performance metrics with 📊 button</li>
                                                </ul>
                                            </div>

                                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                                                <strong className="text-red-800">🚨 Troubleshooting:</strong>
                                                <ul className="list-disc list-inside mt-2 space-y-1 text-red-700">
                                                    <li>If mic button is grayed out: Enable voice input first</li>
                                                    <li>If no permission prompt: Check browser settings</li>
                                                    <li>If recording doesn't start: Try refreshing the page</li>
                                                    <li>If processing fails: Check console for errors</li>
                                                </ul>
                                            </div>

                                            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                                                <strong className="text-purple-800">🎯 Test Features:</strong>
                                                <ul className="list-disc list-inside mt-2 space-y-1 text-purple-700">
                                                    <li>Click <strong>"📊 Performance"</strong> to see metrics</li>
                                                    <li>Click <strong>"🗂️ Cache"</strong> to see audio cache stats</li>
                                                    <li>Click <strong>"🧹 Cleanup All"</strong> to clear caches</li>
                                                    <li>Try speaking the same text twice to test TTS caching</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Component */}
                        <div className={showDebug ? "lg:col-span-2" : "lg:col-span-3"}>
                            <div className="h-full">
                                <DigitalTwinChat />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}