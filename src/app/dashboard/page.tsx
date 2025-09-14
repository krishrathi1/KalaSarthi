
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
      console.log('DashboardPage: User profile:', userProfile.role);
      // Redirect buyers to marketplace, but show main dashboard for artisans and others
      if (userProfile.role === 'buyer') {
        console.log('DashboardPage: Redirecting buyer to marketplace');
        router.push('/marketplace');
      } else {
        console.log('DashboardPage: Showing main dashboard for role:', userProfile.role);
      }
    }
  }, [userProfile, loading, router]);

  // Show loading while determining redirect
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
