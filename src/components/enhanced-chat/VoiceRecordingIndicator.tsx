"use client";

import { useEffect, useState } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  maxDuration?: number;
  onStop?: () => void;
  error?: string;
}

export function VoiceRecordingIndicator({
  isRecording,
  duration,
  audioLevel,
  maxDuration = 60,
  onStop,
  error
}: VoiceRecordingIndicatorProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setPulseAnimation(false);
    }
  }, [isRecording]);
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgressColor = () => {
    const percentage = (duration / maxDuration) * 100;
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getAudioLevelBars = () => {
    const bars = [];
    const numBars = 5;
    const activeBarCount = Math.ceil((audioLevel / 100) * numBars);
    
    for (let i = 0; i < numBars; i++) {
      const isActive = i < activeBarCount;
      const height = isActive ? 'h-4' : 'h-2';
      const opacity = isActive ? 'opacity-100' : 'opacity-30';
      
      bars.push(
        <div
          key={i}
          className={`w-1 ${height} bg-current ${opacity} rounded-full transition-all duration-100`}
        />
      );
    }
    
    return bars;
  };
  
  if (!isRecording && !error) {
    return null;
  }
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[300px]">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {/* Recording Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`relative ${pulseAnimation ? 'animate-pulse' : ''}`}>
                  <Mic className="h-5 w-5 text-red-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="font-medium text-sm">Recording...</span>
              </div>
              
              {onStop && (
                <button
                  onClick={onStop}
                  className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Square className="h-4 w-4" />
                  <span>Stop</span>
                </button>
              )}
            </div>
            
            {/* Duration and Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{formatDuration(duration)}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round((duration / maxDuration) * 100)}%
                </Badge>
              </div>
              
              <Progress 
                value={(duration / maxDuration) * 100} 
                className="h-2"
              />
              
              {duration > maxDuration * 0.9 && (
                <p className="text-xs text-yellow-600">
                  Recording will stop automatically at {maxDuration}s
                </p>
              )}
            </div>
            
            {/* Audio Level Visualization */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Audio Level:</span>
              <div className="flex items-end space-x-1 h-4">
                {getAudioLevelBars()}
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(audioLevel)}%
              </span>
            </div>
            
            {/* Tips */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 Speak clearly and avoid background noise</p>
              <p>🎯 Recording will be automatically transcribed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}