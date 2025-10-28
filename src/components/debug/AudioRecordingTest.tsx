/**
 * Audio Recording Test Component
 * Comprehensive testing and diagnostics for audio recording functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Pause, TestTube, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { diagnoseAudioSupport, logAudioDiagnostics, type AudioDiagnostics } from '@/lib/utils/audioUtils';
import { useToast } from '@/hooks/use-toast';

export function AudioRecordingTest() {
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const {
    isRecording,
    isProcessing,
    isSupported,
    duration,
    error,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    testRecording
  } = useAudioRecording({
    onRecordingComplete: (blob, duration) => {
      toast({
        title: "Recording Complete",
        description: `Recorded ${Math.round(duration / 1000)}s of audio (${blob.size} bytes)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Recording Error",
        description: error,
        variant: "destructive"
      });
    },
    onStatusChange: (status) => {
      console.log('📊 Audio status:', status);
    }
  });

  // Load diagnostics on mount
  useEffect(() => {
    const loadDiagnostics = async () => {
      const diag = await diagnoseAudioSupport();
      setDiagnostics(diag);
      
      // Log detailed diagnostics
      await logAudioDiagnostics();
    };
    
    loadDiagnostics();
  }, []);

  // Handle audio playback
  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  // Run comprehensive test
  const runComprehensiveTest = async () => {
    toast({
      title: "Running Audio Test",
      description: "Testing microphone access and recording capability...",
    });

    const result = await testRecording();
    
    if (result.success) {
      toast({
        title: "Audio Test Passed",
        description: `Recording test completed successfully in ${result.duration}ms`,
      });
    } else {
      toast({
        title: "Audio Test Failed",
        description: result.error || "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  // Refresh diagnostics
  const refreshDiagnostics = async () => {
    const diag = await diagnoseAudioSupport();
    setDiagnostics(diag);
    toast({
      title: "Diagnostics Refreshed",
      description: "Audio support diagnostics have been updated",
    });
  };

  const formatDuration = (ms: number) => {
    return `${Math.round(ms / 1000)}s`;
  };

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return status ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'prompt':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Audio Recording Test</h1>
        <p className="text-gray-600">Comprehensive audio recording diagnostics and testing</p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(isSupported)}
            Audio Recording Status
          </CardTitle>
          <CardDescription>
            Overall audio recording capability assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={isSupported ? "default" : "destructive"}>
              {isSupported ? "Supported" : "Not Supported"}
            </Badge>
            {error && (
              <Badge variant="destructive">
                Error: {error}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Diagnostics
            <Button variant="outline" size="sm" onClick={refreshDiagnostics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Detailed system capability analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Media Devices API</span>
                    {getStatusIcon(diagnostics.hasMediaDevices)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>getUserMedia API</span>
                    {getStatusIcon(diagnostics.hasGetUserMedia)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>MediaRecorder API</span>
                    {getStatusIcon(diagnostics.hasMediaRecorder)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Microphone Permission</span>
                    {getStatusIcon(diagnostics.permissions.microphone)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Audio Input Devices</span>
                    <Badge variant={diagnostics.devices.hasAudioInputs ? "default" : "destructive"}>
                      {diagnostics.devices.audioInputs.length} found
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supported MIME Types</span>
                    <Badge variant={diagnostics.supportedMimeTypes.length > 0 ? "default" : "destructive"}>
                      {diagnostics.supportedMimeTypes.length} types
                    </Badge>
                  </div>
                </div>
              </div>

              {diagnostics.supportedMimeTypes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Supported Audio Formats:</h4>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.supportedMimeTypes.map((mimeType, index) => (
                      <Badge key={index} variant="outline">
                        {mimeType}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {diagnostics.devices.audioInputs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Audio Input Devices:</h4>
                  <div className="space-y-1">
                    {diagnostics.devices.audioInputs.map((device, index) => (
                      <div key={device.deviceId} className="text-sm text-gray-600">
                        {index + 1}. {device.label || `Device ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostics.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                  <div className="space-y-1">
                    {diagnostics.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading diagnostics...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Test */}
      <Card>
        <CardHeader>
          <CardTitle>Recording Test</CardTitle>
          <CardDescription>
            Test actual audio recording functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isSupported || isProcessing}
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <Button
              onClick={runComprehensiveTest}
              disabled={!isSupported || isRecording || isProcessing}
              variant="outline"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Quick Test
            </Button>

            {audioUrl && (
              <Button
                onClick={togglePlayback}
                variant="outline"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            )}
          </div>

          {(isRecording || isProcessing) && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>
                {isRecording ? `Recording... ${formatDuration(duration)}` : 'Processing...'}
              </span>
            </div>
          )}

          {audioBlob && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Recording Successful!</h4>
              <div className="text-sm text-green-700 space-y-1">
                <div>Duration: {formatDuration(duration)}</div>
                <div>Size: {audioBlob.size} bytes</div>
                <div>Type: {audioBlob.type}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>
            Common solutions for audio recording issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">If microphone access is denied:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Click the microphone icon in your browser's address bar</li>
                <li>• Select "Allow" for microphone access</li>
                <li>• Refresh the page and try again</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">If no microphone is found:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Check that your microphone is properly connected</li>
                <li>• Go to Windows Settings → Sound → Input devices</li>
                <li>• Select your microphone as the default input device</li>
                <li>• Test your microphone in Windows Sound settings</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Browser compatibility:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Use Chrome, Firefox, or Edge for best compatibility</li>
                <li>• Ensure your browser is up to date</li>
                <li>• Try using an incognito/private window</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}