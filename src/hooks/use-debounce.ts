import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * Delays updating the value until after the specified delay
 * Optimized for performance
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        if (delay < 0) {
            console.warn('useDebounce: delay should be non-negative');
            return;
        }

        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, Math.max(0, delay));

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}