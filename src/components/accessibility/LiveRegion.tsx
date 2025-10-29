'use client';

import React, { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

/**
 * ARIA Live Region for screen reader announcements
 * Follows WCAG 2.1 guidelines for dynamic content updates
 */
export function LiveRegion({ message, priority = 'polite', clearAfter = 1000 }: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      regionRef.current.textContent = message;

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
    />
  );
}
