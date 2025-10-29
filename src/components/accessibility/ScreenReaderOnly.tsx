import React, { ReactNode } from 'react';

interface ScreenReaderOnlyProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Component that renders content only for screen readers
 * Follows WCAG 2.1 guidelines for visually hidden content
 */
export function ScreenReaderOnly({ children, as: Component = 'span' }: ScreenReaderOnlyProps) {
  return (
    <Component
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0
      }}
    >
      {children}
    </Component>
  );
}
