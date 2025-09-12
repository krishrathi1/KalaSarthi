"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

interface SimpleOfflineStatusProps {
    className?: string;
}

export function SimpleOfflineStatus({ className = "" }: SimpleOfflineStatusProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        if (typeof window === 'undefined') return;

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // Set initial state
        setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Don't render anything during SSR
    if (!mounted) {
        return null;
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {isOnline ? (
                <Wifi className="size-4 text-green-600" />
            ) : (
                <WifiOff className="size-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
                {isOnline ? "Online" : "Offline"}
            </span>
        </div>
    );
}
