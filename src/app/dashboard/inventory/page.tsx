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

  // Loading state - Improved
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
            <Skeleton className="h-4 w-32 sm:w-48" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border rounded-xl p-3 sm:p-4 space-y-2 shadow-sm">
                <Skeleton className="h-4 w-20 sm:w-24" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
                <Skeleton className="h-3 w-16 sm:w-20" />
              </div>
            ))}
          </div>

          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="flex gap-2 bg-white/50 backdrop-blur-sm border rounded-xl p-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>

            <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
              <Skeleton className="h-6 w-32 sm:w-48" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 bg-muted/30 rounded-lg">
                    <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 sm:w-48" />
                      <Skeleton className="h-3 w-24 sm:w-32" />
                    </div>
                    <Skeleton className="h-4 w-12 sm:w-16" />
                    <Skeleton className="h-8 sm:h-10 w-16 sm:w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - user not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="shadow-lg">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-sm sm:text-base">
              You must be logged in to access the inventory management system.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Error state - not an artisan
  if (pageError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Package className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-4">
              {pageError} Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render inventory dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <InventoryDashboard artisanId={user.uid} />
      </div>
    </div>
  );
}