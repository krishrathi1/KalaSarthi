/**
 * Simple trending indicator component for navigation
 * Shows trending status with minimal visual impact
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingIndicatorProps {
  variant?: 'badge' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  trendCount?: number;
}

export function TrendingIndicator({ 
  variant = 'badge',
  size = 'sm',
  className = '',
  showIcon = true,
  showText = true,
  trendCount = 5
}: TrendingIndicatorProps) {
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  if (variant === 'icon') {
    return (
      <div className={cn('relative', className)}>
        <TrendingUp className={cn(
          'text-orange-500',
          size === 'sm' && 'size-3',
          size === 'md' && 'size-4', 
          size === 'lg' && 'size-5'
        )} />
        {trendCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {trendCount > 9 ? '9+' : trendCount}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <span className={cn('text-orange-600 font-medium', sizeClasses[size], className)}>
        {showIcon && <Flame className="inline size-3 mr-1" />}
        {showText && `${trendCount} Hot`}
      </span>
    );
  }

  // Default badge variant
  return (
    <Badge 
      className={cn(
        'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200 hover:from-orange-200 hover:to-red-200',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Zap className="size-3 mr-1" />}
      {showText && (trendCount > 0 ? `${trendCount}` : 'Hot')}
    </Badge>
  );
}

export default TrendingIndicator;