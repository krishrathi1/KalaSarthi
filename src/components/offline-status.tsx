"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Sync, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getOfflineStatus, setLastSync } from "@/lib/offline-storage";
import { syncOfflineData, getSyncStatus } from "@/lib/offline-sync";

interface OfflineStatusProps {
    className?: string;
    showDetails?: boolean;
}

export function OfflineStatus({ className = "", showDetails = false }: OfflineStatusProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [lastSync, setLastSyncTime] = useState<number | undefined>();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [showSyncDetails, setShowSyncDetails] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // Initial status check
        updateStatus();

        // Listen for online/offline events
        const handleOnline = () => {
            setIsOnline(true);
            updateStatus();
            toast({
                title: "Connection Restored",
                description: "You're back online! Syncing offline data...",
                duration: 3000,
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast({
                title: "Working Offline",
                description: "Some features may be limited. Your data will sync when connection is restored.",
                duration: 5000,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic status updates
        const interval = setInterval(updateStatus, 10000); // Every 10 seconds

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [toast]);

    const updateStatus = () => {
        const status = getOfflineStatus();
        setIsOnline(status.online);
        setLastSyncTime(status.lastSync);
    };

    const handleSync = async () => {
        if (!isOnline) {
            toast({
                title: "No Connection",
                description: "Please check your internet connection and try again.",
                variant: "destructive",
            });
            return;
        }

        setIsSyncing(true);
        setSyncProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setSyncProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const result = await syncOfflineData();

            clearInterval(progressInterval);
            setSyncProgress(100);

            if (result.success) {
                setLastSync();
                setLastSyncTime(Date.now());

                toast({
                    title: "Sync Complete",
                    description: `Successfully synced ${result.synced} items.`,
                    duration: 3000,
                });
            } else {
                toast({
                    title: "Sync Failed",
                    description: result.errors[0] || "Failed to sync offline data.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Sync Error",
                description: "An error occurred while syncing data.",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncProgress(0), 1000);
        }
    };

    const formatLastSync = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const getStatusColor = () => {
        if (isOnline) return "text-green-600";
        return "text-red-600";
    };

    const getStatusIcon = () => {
        if (isOnline) return <Wifi className="size-4" />;
        return <WifiOff className="size-4" />;
    };

    const getStatusText = () => {
        if (isOnline) return "Online";
        return "Offline";
    };

    const getSyncStatusColor = () => {
        if (!isOnline) return "text-gray-500";
        if (isSyncing) return "text-blue-600";
        if (lastSync) return "text-green-600";
        return "text-yellow-600";
    };

    const getSyncStatusIcon = () => {
        if (!isOnline) return <AlertCircle className="size-3" />;
        if (isSyncing) return <Sync className="size-3 animate-spin" />;
        if (lastSync) return <CheckCircle className="size-3" />;
        return <AlertCircle className="size-3" />;
    };

    const getSyncStatusText = () => {
        if (!isOnline) return "No sync (offline)";
        if (isSyncing) return "Syncing...";
        if (lastSync) return `Last sync: ${formatLastSync(lastSync)}`;
        return "Never synced";
    };

    if (!showDetails) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="text-sm font-medium">{getStatusText()}</span>
                </div>

                {isOnline && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="h-6 px-2 text-xs"
                    >
                        {isSyncing ? (
                            <Sync className="size-3 animate-spin" />
                        ) : (
                            <Sync className="size-3" />
                        )}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Card className={`border-l-4 ${isOnline ? 'border-l-green-500' : 'border-l-red-500'} ${className}`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                            {getStatusIcon()}
                            <span className="font-medium">{getStatusText()}</span>
                        </div>

                        <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
                            {isOnline ? "Connected" : "Disconnected"}
                        </Badge>
                    </div>

                    {isOnline && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="h-8"
                        >
                            {isSyncing ? (
                                <>
                                    <Sync className="size-3 animate-spin mr-1" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Sync className="size-3 mr-1" />
                                    Sync Now
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {isSyncing && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                            <span>Syncing offline data...</span>
                            <span>{syncProgress}%</span>
                        </div>
                        <Progress value={syncProgress} className="h-2" />
                    </div>
                )}

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sync Status:</span>
                        <div className={`flex items-center gap-1 ${getSyncStatusColor()}`}>
                            {getSyncStatusIcon()}
                            <span className="text-xs">{getSyncStatusText()}</span>
                        </div>
                    </div>

                    {isOnline && (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Connection:</span>
                            <span className="text-xs text-green-600">Stable</span>
                        </div>
                    )}

                    {!isOnline && (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Offline Mode:</span>
                            <span className="text-xs text-yellow-600">Limited features</span>
                        </div>
                    )}
                </div>

                {showDetails && (
                    <div className="mt-3 pt-3 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSyncDetails(!showSyncDetails)}
                            className="w-full text-xs"
                        >
                            {showSyncDetails ? "Hide" : "Show"} Sync Details
                        </Button>

                        {showSyncDetails && (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <div>• Cached data will sync when online</div>
                                <div>• Offline changes are queued for sync</div>
                                <div>• Some features require internet connection</div>
                                <div>• Data is stored locally for offline access</div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
