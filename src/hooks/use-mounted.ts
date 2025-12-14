import { useEffect, useState } from 'react';

/**
 * Hook to check if component is mounted on client side
 * Useful for preventing hydration mismatches with client-only features
 * Enhanced with better SSR support
 */
export function useMounted() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setMounted(true);
        }
    }, []);

    return mounted;
}
