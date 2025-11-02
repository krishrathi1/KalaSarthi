/**
 * Data Source Indicator Component
 * Shows whether data is live, cached, or mock/demo data
 * Integrated for use with SimplifiedTrendSpotter
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, TestTube, Wifi, WifiOff } from 'lucide-react';

interface DataSourceIndicatorProps {
  source?: 'live' | 'mock' | 'cached' | 'api';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export function DataSourceIndicator({ 
  source = 'live', 
  className = '',
  showIcon = true,
  showText = true 
}: DataSourceIndicatorProps) {
  const getSourceConfig = () => {
    switch (source) {
      case 'mock':
        return {
          icon: TestTube,
          text: '',
          variant: 'secondary' as const,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200'
        };
      case 'cached':
        return {
          icon: Database,
          text: 'Cached',
          variant: 'outline' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200'
        };
      case 'api':
      case 'live':
      default:
        return {
          icon: Wifi,
          text: 'Live Data',
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
    }
  };

  const config = getSourceConfig();
  const Icon = config.icon;

  if (!showIcon && !showText) return null;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.bgColor} ${config.color} ${className}`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {showText && config.text}
    </Badge>
  );
}

export default DataSourceIndicator;