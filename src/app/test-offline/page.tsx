"use client";

import React from 'react';
import { OfflineSearch } from '@/components/ui/OfflineSearch';
import { OfflineAnalytics } from '@/components/ui/OfflineAnalytics';
import { useOffline } from '@/hooks/use-offline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestOfflinePage() {
    const { isOnline, hasOfflineData, storageUsage } = useOffline();

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Offline Features Test</h1>
                <p className="text-muted-foreground">
                    Test your enhanced offline capabilities
                </p>
            </div>

            {/* Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Connection:</span>
                            <span className={`ml-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">Cached Data:</span>
                            <span className="ml-2">
                                {hasOfflineData ? 'Available' : 'None'}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">Storage Used:</span>
                            <span className="ml-2">
                                {Math.round(storageUsage.used / 1024)} KB
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">Storage Available:</span>
                            <span className="ml-2">
                                {Math.round(storageUsage.available / 1024 / 1024)} MB
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search Test */}
            <Card>
                <CardHeader>
                    <CardTitle>Offline Search Test</CardTitle>
                </CardHeader>
                <CardContent>
                    <OfflineSearch
                        onResultSelect={(result) => {
                            console.log('Search result selected:', result);
                            alert(`Selected: ${result.title} (${result.type})`);
                        }}
                        placeholder="Search cached data..."
                        className="w-full"
                    />
                </CardContent>
            </Card>

            {/* Analytics */}
            <OfflineAnalytics />
        </div>
    );
}