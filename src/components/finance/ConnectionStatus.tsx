'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  lastUpdated?: Date | null;
  className?: string;
}

export default function ConnectionStatus({ 
  connectionState, 
  lastUpdated, 
  className = '' 
}: ConnectionStatusProps) {
  const getStatusDisplay = () => {
    switch (connectionState) {
      case 'online':
        return {
          icon: CheckCircle,
          text: 'Connected',
          variant: 'default' as const,
          color: 'text-green-500'
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          variant: 'destructive' as const,
          color: 'text-red-500'
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: 'Reconnecting',
          variant: 'secondary' as const,
          color: 'text-yellow-500'
        };
      default:
        return {
          icon: Wifi,
          text: 'Unknown',
          variant: 'outline' as const,
          color: 'text-gray-500'
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={status.variant} className="flex items-center gap-1">
        <StatusIcon 
          className={`h-3 w-3 ${status.color} ${
            connectionState === 'reconnecting' ? 'animate-spin' : ''
          }`} 
        />
        {status.text}
      </Badge>
      
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">
          Updated {formatLastUpdated(lastUpdated)}
        </span>
      )}
    </div>
  );
}