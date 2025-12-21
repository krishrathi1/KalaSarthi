
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Dashboard } from '@/components/dashboard';

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile) {
      // Redirect buyers to marketplace, but show main dashboard for artisans and others
      if (userProfile.role === 'buyer') {
        router.replace('/marketplace');
      }
      // For artisans and other roles, show the dashboard
    }
  }, [userProfile, loading, router]);

  // Show loading while determining redirect
  // Enhanced user experience with better loading states
  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show the main dashboard for artisans and other roles
  return <Dashboard />;
}
