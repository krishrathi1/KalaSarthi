"use client";

import React, { useState, useEffect } from 'react';
import {
    Download,
    Database,
    TrendingUp,
    ShoppingCart,
    Heart,
    MessageCircle,
    Package,
    Wifi,
    WifiOff,
    Calendar,
    FileText,
    BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOffline } from '@/hooks/use-offline';
import { offlineExporter } from '@/lib/offline-export';
import { useToast } from '@/hooks/use-toast';

interface OfflineAnalyticsProps {
    className?: string;
}

export function OfflineAnalytics({ className = "" }: OfflineAnalyticsProps) {
    const [summary, setSummary] = useState({
        products: 0,
        trends: 0,
        cart: 0,
        wishlist: 0,
        chat: 0,
        totalSize: 0
    });
    const [isExporting, setIsExporting] = useState(false);

    const { isOnline, storageUsage, lastSync } = useOffline();
    const { toast } = useToast();

    // Load summary data
    useEffect(() => {
        const loadSummary = async () => {
            try {
                const data = await offlineExporter.getExportSummary();
                setSummary(data);
            } catch (error) {
                console.error('Failed to load summary:', error);
            }
        };

        loadSummary();
    }, []);

    // Format bytes
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    };

    // Calculate storage percentage
    const storagePercentage = storageUsage.available > 0
        ? (storageUsage.used / storageUsage.available) * 100
        : 0;

    // Handle export
    const handleExport = async (format: 'json' | 'csv') => {
        setIsExporting(true);
        try {
            await offlineExporter.downloadExport({ format });
            toast({
                title: "Export Complete",
                description: `Offline data exported as ${format.toUpperCase()}`,
            });
        } catch (error) {
            toast({
                title: "Export Failed",
                description: "Failed to export offline data",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const dataItems = [
        {
            icon: Package,
            label: 'Products',
            count: summary.products,
            color: 'text-blue-600'
        },
        {
            icon: TrendingUp,
            label: 'Trends',
            count: summary.trends,
            color: 'text-green-600'
        },
        {
            icon: ShoppingCart,
            label: 'Cart Items',
            count: summary.cart,
            color: 'text-purple-600'
        },
        {
            icon: Heart,
            label: 'Wishlist',
            count: summary.wishlist,
            color: 'text-red-600'
        },
        {
            icon: MessageCircle,
            label: 'Messages',
            count: summary.chat,
            color: 'text-orange-600'
        }
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6" />
                    <div>
                        <h2 className="text-xl font-semibold">Offline Analytics</h2>
                        <p className="text-sm text-muted-foreground">
                            Your cached data and storage usage
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant={isOnline ? "default" : "destructive"}>
                        {isOnline ? (
                            <>
                                <Wifi className="h-3 w-3 mr-1" />
                                Online
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3 mr-1" />
                                Offline
                            </>
                        )}
                    </Badge>
                </div>
            </div>

            {/* Storage Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Storage Usage
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span>Used: {formatBytes(storageUsage.used)}</span>
                        <span>Available: {formatBytes(storageUsage.available)}</span>
                    </div>

                    <Progress value={storagePercentage} className="h-2" />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{storagePercentage.toFixed(1)}% used</span>
                        <span>Last sync: {formatDate(lastSync)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Data Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataItems.map((item, index) => (
                    <Card key={index}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <item.icon className={`h-8 w-8 ${item.color}`} />
                                <div>
                                    <p className="text-2xl font-bold">{item.count}</p>
                                    <p className="text-sm text-muted-foreground">{item.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Export Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export Data
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Export your offline data for backup or analysis
                    </p>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleExport('json')}
                            disabled={isExporting}
                            variant="outline"
                            size="sm"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Export JSON
                        </Button>

                        <Button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            variant="outline"
                            size="sm"
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>

                    {isExporting && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            Preparing export...
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Total Items:</span>
                            <span className="ml-2 font-medium">
                                {summary.products + summary.trends + summary.cart + summary.wishlist + summary.chat}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Data Size:</span>
                            <span className="ml-2 font-medium">{formatBytes(summary.totalSize)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span className="ml-2 font-medium">
                                {isOnline ? 'Synced' : 'Offline Mode'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Last Update:</span>
                            <span className="ml-2 font-medium">{formatDate(lastSync)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}