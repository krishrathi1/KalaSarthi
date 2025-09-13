'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Package } from 'lucide-react';
import InventoryDashboard from '@/components/inventory/inventory-dashboard';
import { useAuth } from '@/context/auth-context';

export default function InventoryPage() {
  const { user, loading, isArtisan } = useAuth();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    // Handle authentication and authorization
    if (!loading) {
      if (!user) {
        console.log('InventoryPage: No user found, redirecting to auth');
        redirect('/auth');
      } else if (!isArtisan) {
        console.log('InventoryPage: User is not an artisan');
        setPageError('Access denied. This page is only available for artisans.');
      } else {
        console.log('InventoryPage: User authenticated as artisan:', user.uid);
        setPageError(null);
      }
    }
  }, [user, loading, isArtisan]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex space-x-1 border rounded-lg p-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - user not authenticated
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access the inventory management system.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state - not an artisan
  if (pageError) {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <Package className="h-16 w-16 text-muted-foreground mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {pageError} Please contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Success state - render inventory dashboard
  return (
    <div className="container mx-auto py-8">
      <InventoryDashboard artisanId={user.uid} />
    </div>
  );
}