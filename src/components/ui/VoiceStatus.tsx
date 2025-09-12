'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { VoiceNavigationService } from '@/lib/service/VoiceNavigationService';
import { cn } from '@/lib/utils';

interface VoiceStatusProps {
  className?: string;
  showHistory?: boolean;
  maxHistoryItems?: number;
}

interface VoiceEvent {
  type: 'command' | 'response' | 'error' | 'status';
  message: string;
  timestamp: Date;
  success?: boolean;
}

export function VoiceStatus({
  className,
  showHistory = true,
  maxHistoryItems = 5
}: VoiceStatusProps) {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [eventHistory, setEventHistory] = useState<VoiceEvent[]>([]);
  const [voiceService, setVoiceService] = useState<VoiceNavigationService | null>(null);

  useEffect(() => {
    // Initialize voice service reference
    const service = VoiceNavigationService.getInstance();
    setVoiceService(service);

    // Set up event listeners
    const handleListening = (data: any) => {
      setIsActive(data.active);
      addEvent('status', data.active ? 'Voice listening started' : 'Voice listening stopped', true);
    };

    const handleCommand = (data: any) => {
      setIsProcessing(true);
      addEvent('command', `Heard: "${data.command.command}"`, true);
    };

    const handleAction = (data: any) => {
      setIsProcessing(false);
      const success = data.action && data.executed;
      addEvent('response', `Action ${success ? 'completed' : 'failed'}`, success);
    };

    const handleError = (data: any) => {
      setIsProcessing(false);
      addEvent('error', `Error: ${data.error}`, false);
    };

    service.on('listening', handleListening);
    service.on('command', handleCommand);
    service.on('action', handleAction);
    service.on('error', handleError);

    // Cleanup
    return () => {
      service.off('listening', handleListening);
      service.off('command', handleCommand);
      service.off('action', handleAction);
      service.off('error', handleError);
    };
  }, []);

  const addEvent = (type: VoiceEvent['type'], message: string, success?: boolean) => {
    const event: VoiceEvent = {
      type,
      message,
      timestamp: new Date(),
      success
    };

    setEventHistory(prev => {
      const newHistory = [event, ...prev];
      return newHistory.slice(0, maxHistoryItems);
    });
  };

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (isActive) {
      return <Mic className="h-4 w-4 text-red-500 animate-pulse" />;
    }
    return <MicOff className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (isProcessing) return 'Processing...';
    if (isActive) return 'Listening';
    return 'Inactive';
  };

  const getStatusColor = () => {
    if (isProcessing) return 'text-blue-600';
    if (isActive) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (event: VoiceEvent) => {
    switch (event.type) {
      case 'command':
        return <Mic className="h-3 w-3 text-blue-500" />;
      case 'response':
        return event.success ?
          <CheckCircle className="h-3 w-3 text-green-500" /> :
          <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'status':
        return <Volume2 className="h-3 w-3 text-gray-500" />;
      default:
        return <Volume2 className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          <span>Voice Navigation</span>
          <Badge
            variant={isActive ? 'destructive' : 'secondary'}
            className="ml-auto"
          >
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('text-sm font-medium', getStatusColor())}>
              {getStatusText()}
            </div>
            {isActive && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {currentLanguage.toUpperCase()}
          </div>
        </div>

        {/* Voice Commands Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Try saying:</div>
          <div className="font-mono bg-muted px-2 py-1 rounded text-xs">
            "Go to finance" • "Show marketplace" • "Open profile"
          </div>
          <div className="font-mono bg-muted px-2 py-1 rounded text-xs">
            "मेरे फाइनेंस पेज पर जाओ" • "मार्केटप्लेस दिखाओ"
          </div>
        </div>

        {/* Event History */}
        {showHistory && eventHistory.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Recent Activity
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {eventHistory.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded"
                >
                  {getEventIcon(event)}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{event.message}</div>
                    <div className="text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        {!isActive && (
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
            💡 Click the microphone button to start voice navigation
          </div>
        )}
      </CardContent>
    </Card>
  );
}