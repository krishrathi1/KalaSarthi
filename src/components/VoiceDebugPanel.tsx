'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface VoiceDebugPanelProps {
    voiceServiceStatus: any;
    voiceConfig: any;
    isRecording: boolean;
    isProcessingVoice: boolean;
    loading: boolean;
    onToggleVoiceInput: () => void;
    onToggleVoiceOutput: () => void;
    onCheckServices: () => void;
}

export function VoiceDebugPanel({
    voiceServiceStatus,
    voiceConfig,
    isRecording,
    isProcessingVoice,
    loading,
    onToggleVoiceInput,
    onToggleVoiceOutput,
    onCheckServices
}: VoiceDebugPanelProps) {
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        setDebugInfo({
            servicesInitialized: voiceServiceStatus.servicesInitialized,
            sttAvailable: voiceServiceStatus.sttAvailable,
            ttsAvailable: voiceServiceStatus.ttsAvailable,
            voiceInputEnabled: voiceConfig.voiceInputEnabled,
            voiceOutputEnabled: voiceConfig.voiceOutputEnabled,
            microphonePermission: voiceServiceStatus.microphonePermission,
            isRecording,
            isProcessingVoice,
            loading,
            selectedTTSService: voiceServiceStatus.selectedTTSService
        });
    }, [voiceServiceStatus, voiceConfig, isRecording, isProcessingVoice, loading]);

    const getStatusIcon = (status: boolean) => {
        return status ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
        );
    };

    const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
        return (
            <Badge variant={status ? "default" : "destructive"}>
                {status ? trueText : falseText}
            </Badge>
        );
    };

    const canUseMicrophone =
        debugInfo.servicesInitialized &&
        debugInfo.sttAvailable &&
        debugInfo.voiceInputEnabled &&
        !debugInfo.loading;

    return (
        <Card className="mb-4 border-2 border-blue-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    🔧 Voice Debug Panel
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCheckServices}
                        className="ml-auto"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Service Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium">Service Status</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                                <span>Services Initialized:</span>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(debugInfo.servicesInitialized)}
                                    {getStatusBadge(debugInfo.servicesInitialized, "Ready", "Loading")}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>STT Available:</span>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(debugInfo.sttAvailable)}
                                    {getStatusBadge(debugInfo.sttAvailable, "Available", "Unavailable")}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>TTS Available:</span>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(debugInfo.ttsAvailable)}
                                    {getStatusBadge(debugInfo.ttsAvailable, "Available", "Unavailable")}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>TTS Service:</span>
                                <Badge variant="outline">
                                    {debugInfo.selectedTTSService || 'Unknown'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium">Configuration</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                                <span>Voice Input:</span>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(debugInfo.voiceInputEnabled)}
                                    <Button
                                        variant={debugInfo.voiceInputEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={onToggleVoiceInput}
                                        className="h-6 px-2 text-xs"
                                    >
                                        <Mic className="h-3 w-3 mr-1" />
                                        {debugInfo.voiceInputEnabled ? "Enabled" : "Disabled"}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Voice Output:</span>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(debugInfo.voiceOutputEnabled)}
                                    <Button
                                        variant={debugInfo.voiceOutputEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={onToggleVoiceOutput}
                                        className="h-6 px-2 text-xs"
                                    >
                                        <Volume2 className="h-3 w-3 mr-1" />
                                        {debugInfo.voiceOutputEnabled ? "Enabled" : "Disabled"}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Microphone Permission:</span>
                                <Badge
                                    variant={
                                        debugInfo.microphonePermission === 'granted' ? "default" :
                                            debugInfo.microphonePermission === 'denied' ? "destructive" : "secondary"
                                    }
                                >
                                    {debugInfo.microphonePermission || 'Unknown'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current State */}
                <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Current State</h4>
                    <div className="flex flex-wrap gap-2">
                        {debugInfo.isRecording && (
                            <Badge variant="destructive" className="animate-pulse">
                                🔴 Recording
                            </Badge>
                        )}
                        {debugInfo.isProcessingVoice && (
                            <Badge variant="default">
                                ⏳ Processing
                            </Badge>
                        )}
                        {debugInfo.loading && (
                            <Badge variant="secondary">
                                🔄 Loading
                            </Badge>
                        )}
                        {!debugInfo.isRecording && !debugInfo.isProcessingVoice && !debugInfo.loading && (
                            <Badge variant="outline">
                                ⏸️ Idle
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Microphone Status */}
                <div className="border-t pt-4">
                    <div className={`p-3 rounded-lg ${canUseMicrophone ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Mic className={`h-5 w-5 ${canUseMicrophone ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={`font-medium ${canUseMicrophone ? 'text-green-800' : 'text-red-800'}`}>
                                Microphone Status: {canUseMicrophone ? 'Ready' : 'Not Ready'}
                            </span>
                        </div>

                        {!canUseMicrophone && (
                            <div className="text-sm text-red-700">
                                <p className="mb-1">Issues preventing microphone use:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {!debugInfo.servicesInitialized && <li>Voice services not initialized</li>}
                                    {!debugInfo.sttAvailable && <li>Speech-to-text service unavailable</li>}
                                    {!debugInfo.voiceInputEnabled && <li>Voice input disabled (click "Input" button above)</li>}
                                    {debugInfo.loading && <li>System is loading</li>}
                                    {debugInfo.microphonePermission === 'denied' && <li>Microphone permission denied</li>}
                                </ul>
                            </div>
                        )}

                        {canUseMicrophone && (
                            <p className="text-sm text-green-700">
                                ✅ All systems ready! Click the microphone button to start recording.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}