'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function VoiceDebugPage() {
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const checkServices = async () => {
        setLoading(true);
        try {
            console.log('🔍 Checking voice services...');

            // Check if we're in browser environment
            const browserInfo = {
                isClient: typeof window !== 'undefined',
                hasNavigator: typeof navigator !== 'undefined',
                hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
                hasSpeechSynthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
                hasWebAudio: typeof window !== 'undefined' && 'AudioContext' in window,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
            };

            // Check microphone permission
            let micPermission = 'unknown';
            if (navigator?.permissions) {
                try {
                    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                    micPermission = permission.state;
                } catch (e) {
                    micPermission = 'error';
                }
            }

            // Test getUserMedia
            let getUserMediaTest = 'not-tested';
            if (navigator?.mediaDevices?.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    getUserMediaTest = 'success';
                    // Stop the stream immediately
                    stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    getUserMediaTest = `error: ${e.message}`;
                }
            }

            // Test speech synthesis
            let speechSynthesisTest = 'not-available';
            if (window.speechSynthesis) {
                try {
                    const voices = speechSynthesis.getVoices();
                    speechSynthesisTest = `available (${voices.length} voices)`;
                } catch (e) {
                    speechSynthesisTest = `error: ${e.message}`;
                }
            }

            // Test API endpoints
            let apiTest = 'not-tested';
            try {
                const response = await fetch('/api/test-voice-services', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });

                if (response.ok) {
                    const data = await response.json();
                    apiTest = `success: ${JSON.stringify(data)}`;
                } else {
                    apiTest = `error: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                apiTest = `error: ${e.message}`;
            }

            setDebugInfo({
                browserInfo,
                micPermission,
                getUserMediaTest,
                speechSynthesisTest,
                apiTest,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Debug check failed:', error);
            setDebugInfo({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        checkServices();
    }, []);

    const testMicrophone = async () => {
        try {
            console.log('🎤 Testing microphone...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('✅ Microphone access granted');
            alert('✅ Microphone test successful! You should see a permission granted.');

            // Stop the stream
            stream.getTracks().forEach(track => track.stop());

            // Refresh the debug info
            checkServices();
        } catch (error) {
            console.error('❌ Microphone test failed:', error);
            alert(`❌ Microphone test failed: ${error.message}`);
        }
    };

    const testSpeechSynthesis = () => {
        try {
            console.log('🔊 Testing speech synthesis...');
            const utterance = new SpeechSynthesisUtterance('Hello, this is a test of speech synthesis.');
            utterance.onstart = () => console.log('🔊 Speech started');
            utterance.onend = () => console.log('✅ Speech ended');
            utterance.onerror = (e) => console.error('❌ Speech error:', e);

            speechSynthesis.speak(utterance);
            alert('🔊 Speech synthesis test started. You should hear audio.');
        } catch (error) {
            console.error('❌ Speech synthesis test failed:', error);
            alert(`❌ Speech synthesis test failed: ${error.message}`);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        🔧 Voice Services Debug Panel
                        <Button onClick={checkServices} disabled={loading}>
                            {loading ? 'Checking...' : 'Refresh'}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {debugInfo.error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                            <strong className="text-red-800">Error:</strong>
                            <pre className="text-red-700 mt-2">{debugInfo.error}</pre>
                        </div>
                    )}

                    {debugInfo.browserInfo && (
                        <div>
                            <h3 className="font-bold mb-2">Browser Environment</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Is Client: <Badge variant={debugInfo.browserInfo.isClient ? "default" : "destructive"}>{debugInfo.browserInfo.isClient ? "Yes" : "No"}</Badge></div>
                                <div>Has Navigator: <Badge variant={debugInfo.browserInfo.hasNavigator ? "default" : "destructive"}>{debugInfo.browserInfo.hasNavigator ? "Yes" : "No"}</Badge></div>
                                <div>Has MediaDevices: <Badge variant={debugInfo.browserInfo.hasMediaDevices ? "default" : "destructive"}>{debugInfo.browserInfo.hasMediaDevices ? "Yes" : "No"}</Badge></div>
                                <div>Has SpeechSynthesis: <Badge variant={debugInfo.browserInfo.hasSpeechSynthesis ? "default" : "destructive"}>{debugInfo.browserInfo.hasSpeechSynthesis ? "Yes" : "No"}</Badge></div>
                                <div>Has WebAudio: <Badge variant={debugInfo.browserInfo.hasWebAudio ? "default" : "destructive"}>{debugInfo.browserInfo.hasWebAudio ? "Yes" : "No"}</Badge></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                                User Agent: {debugInfo.browserInfo.userAgent}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-bold mb-2">Microphone Status</h3>
                        <div className="space-y-2">
                            <div>Permission: <Badge variant={debugInfo.micPermission === 'granted' ? "default" : "destructive"}>{debugInfo.micPermission}</Badge></div>
                            <div>getUserMedia Test: <Badge variant={debugInfo.getUserMediaTest === 'success' ? "default" : "destructive"}>{debugInfo.getUserMediaTest}</Badge></div>
                            <Button onClick={testMicrophone} size="sm">Test Microphone Access</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Speech Synthesis Status</h3>
                        <div className="space-y-2">
                            <div>Status: <Badge>{debugInfo.speechSynthesisTest}</Badge></div>
                            <Button onClick={testSpeechSynthesis} size="sm">Test Speech Synthesis</Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">API Services</h3>
                        <div>
                            <div>API Test: <Badge variant={debugInfo.apiTest?.includes('success') ? "default" : "destructive"}>{debugInfo.apiTest}</Badge></div>
                        </div>
                    </div>

                    {debugInfo.timestamp && (
                        <div className="text-xs text-gray-500">
                            Last checked: {debugInfo.timestamp}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}